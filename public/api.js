export class ApiError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}
async function parseResponse(res) {
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new ApiError(body.error ?? "request failed", body.code ?? "UNKNOWN");
    }
    return res.json();
}
export async function createHabit(name) {
    const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
    });
    return parseResponse(res);
}
export async function listHabits() {
    const res = await fetch("/api/habits");
    return parseResponse(res);
}
export async function setEntry(habitId, date, done) {
    const res = await fetch(`/api/habits/${habitId}/entries/${date}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done }),
    });
    return parseResponse(res);
}
