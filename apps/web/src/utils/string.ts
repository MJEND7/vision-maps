
export function truncate(str: string, end: number) {
    if (str.length < end) return str
    return str.slice(0, end)+"..."
}

export function firstLetterUppercase(str: string) {
    return str[0].toUpperCase()+str.slice(1)
}
