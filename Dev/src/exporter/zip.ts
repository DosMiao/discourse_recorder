// Minimal STORE-mode ZIP writer. Images are already compressed (JPEG/PNG/WebP),
// so DEFLATE would barely shrink them while pulling in a much larger codec
// dependency. We just frame each file with a Local File Header + Central
// Directory Header + EOCD record — enough for any modern unzip tool.
//
// Limitations: no encryption, no compression, no ZIP64 (so per-file and
// archive sizes are capped at ~4 GiB). Plenty for a forum-thread export.

const utf8 = new TextEncoder();

// CRC-32 (IEEE 802.3, poly 0xEDB88320). Lazy-built table so repeated calls
// don't recompute.
let crcTable: Uint32Array | null = null;
function getCrcTable(): Uint32Array {
    if (crcTable) return crcTable;
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[i] = c >>> 0;
    }
    crcTable = t;
    return t;
}

function crc32(bytes: Uint8Array): number {
    const t = getCrcTable();
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
        c = (t[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8)) >>> 0;
    }
    return (c ^ 0xffffffff) >>> 0;
}

// DOS date/time encoding for ZIP timestamps. Seconds are halved (2-second
// resolution); 1980 is the epoch year.
function dosDateTime(d: Date): { time: number; date: number } {
    const time =
        ((d.getHours() & 0x1f) << 11) |
        ((d.getMinutes() & 0x3f) << 5) |
        (Math.floor(d.getSeconds() / 2) & 0x1f);
    const date =
        (((d.getFullYear() - 1980) & 0x7f) << 9) |
        (((d.getMonth() + 1) & 0x0f) << 5) |
        (d.getDate() & 0x1f);
    return { time, date };
}

export interface ZipEntry {
    path: string; // forward-slash separated, no leading slash
    data: Uint8Array;
    date?: Date;
}

export function buildZip(entries: ZipEntry[]): Blob {
    // Pre-compute per-entry metadata so we can size the final buffer exactly.
    interface Prepared {
        nameBytes: Uint8Array;
        data: Uint8Array;
        crc: number;
        dosTime: number;
        dosDate: number;
        localOffset: number;
    }
    const prepared: Prepared[] = [];
    let cursor = 0;

    // First pass: build local file headers + data, track offsets for the
    // central directory written at the end.
    const localChunks: Uint8Array[] = [];
    for (const e of entries) {
        const nameBytes = utf8.encode(e.path.replace(/\\/g, '/'));
        const data = e.data;
        const crc = crc32(data);
        const { time, date } = dosDateTime(e.date ?? new Date());

        const header = new Uint8Array(30 + nameBytes.length);
        const dv = new DataView(header.buffer);
        dv.setUint32(0, 0x04034b50, true); // local file header signature
        dv.setUint16(4, 20, true); // version needed (2.0)
        dv.setUint16(6, 0x0800, true); // general purpose bit flag — UTF-8 filename
        dv.setUint16(8, 0, true); // method = STORE
        dv.setUint16(10, time, true);
        dv.setUint16(12, date, true);
        dv.setUint32(14, crc, true);
        dv.setUint32(18, data.length, true); // compressed size
        dv.setUint32(22, data.length, true); // uncompressed size
        dv.setUint16(26, nameBytes.length, true);
        dv.setUint16(28, 0, true); // extra field length
        header.set(nameBytes, 30);

        prepared.push({
            nameBytes,
            data,
            crc,
            dosTime: time,
            dosDate: date,
            localOffset: cursor,
        });
        localChunks.push(header, data);
        cursor += header.length + data.length;
    }

    // Second pass: build central directory entries.
    const centralChunks: Uint8Array[] = [];
    let centralSize = 0;
    const centralStart = cursor;
    for (const p of prepared) {
        const entry = new Uint8Array(46 + p.nameBytes.length);
        const dv = new DataView(entry.buffer);
        dv.setUint32(0, 0x02014b50, true); // central directory header signature
        dv.setUint16(4, 20, true); // version made by
        dv.setUint16(6, 20, true); // version needed
        dv.setUint16(8, 0x0800, true); // general purpose bit flag — UTF-8
        dv.setUint16(10, 0, true); // method
        dv.setUint16(12, p.dosTime, true);
        dv.setUint16(14, p.dosDate, true);
        dv.setUint32(16, p.crc, true);
        dv.setUint32(20, p.data.length, true);
        dv.setUint32(24, p.data.length, true);
        dv.setUint16(28, p.nameBytes.length, true);
        dv.setUint16(30, 0, true); // extra
        dv.setUint16(32, 0, true); // comment
        dv.setUint16(34, 0, true); // disk number start
        dv.setUint16(36, 0, true); // internal attrs
        dv.setUint32(38, 0, true); // external attrs
        dv.setUint32(42, p.localOffset, true);
        entry.set(p.nameBytes, 46);
        centralChunks.push(entry);
        centralSize += entry.length;
    }

    // End of central directory record.
    const eocd = new Uint8Array(22);
    const eocdView = new DataView(eocd.buffer);
    eocdView.setUint32(0, 0x06054b50, true);
    eocdView.setUint16(4, 0, true); // disk number
    eocdView.setUint16(6, 0, true); // disk where CD starts
    eocdView.setUint16(8, prepared.length, true); // entries on this disk
    eocdView.setUint16(10, prepared.length, true); // total entries
    eocdView.setUint32(12, centralSize, true);
    eocdView.setUint32(16, centralStart, true);
    eocdView.setUint16(20, 0, true); // comment length

    // BlobPart's strict typing in TS 5.7+ rejects Uint8Array<ArrayBufferLike>,
    // so concatenate into one ArrayBuffer-backed Uint8Array up front.
    const parts: Uint8Array[] = [...localChunks, ...centralChunks, eocd];
    const total = parts.reduce((sum, p) => sum + p.length, 0);
    const flat = new Uint8Array(new ArrayBuffer(total));
    let off = 0;
    for (const p of parts) {
        flat.set(p, off);
        off += p.length;
    }
    return new Blob([flat], { type: 'application/zip' });
}
