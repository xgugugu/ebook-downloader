export function formatSize(size) {
    if (size < 1024) {
        return size + ' B';
    } else if (size >= 1024 && size < Math.pow(1024, 2)) {
        return parseFloat(size / 1024).toFixed(2) + ' KiB';
    } else if (size >= Math.pow(1024, 2) && size < Math.pow(1024, 3)) {
        return parseFloat(size / Math.pow(1024, 2)).toFixed(2) + ' MiB';
    } else if (size > Math.pow(1024, 3)) {
        return parseFloat(size / Math.pow(1024, 3)).toFixed(2) + ' GiB';
    } else {
        return 0 + ' B';
    }
}
export function timeColor(ms, chalk) {
    if (ms < 2000) {
        return chalk.greenBright(`${ms}ms`);
    } else if (ms < 10000) {
        return chalk.yellowBright(`${ms}ms`);
    } else {
        return chalk.redBright(`${ms}ms`);
    }
}