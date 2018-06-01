export function sortByDate(field) {
    return function (a,b) {
        return (new Date(b[field].split('/').reverse().join('-'))).getTime() -
            (new Date(a[field].split('/').reverse().join('-'))).getTime();
    }
}