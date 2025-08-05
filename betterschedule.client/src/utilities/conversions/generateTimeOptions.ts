export function generateTimeOptions() {
    const times = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 15) {
            const hour = h.toString().padStart(2, "0");
            const min = m.toString().padStart(2, "0");
            times.push(`${hour}:${min}`);
        }
    }
    return times;
}
