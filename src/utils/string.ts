
export function truncate(str: string, end: number) {
    if (str.length < end) return str
    return str.slice(0, end)+"..."
}
