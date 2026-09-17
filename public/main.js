import { ApiError, createHabit, listHabits, setEntry } from "./api.js";
const form = document.getElementById("add-habit-form");
const nameInput = document.getElementById("habit-name-input");
const addButton = document.getElementById("add-habit-button");
const addError = document.getElementById("add-habit-error");
const emptyState = document.getElementById("empty-state");
const habitList = document.getElementById("habit-list");
function todayUtc() {
    return new Date().toISOString().slice(0, 10);
}
function showAddError(message) {
    addError.textContent = message;
    addError.hidden = false;
}
function clearAddError() {
    addError.hidden = true;
    addError.textContent = "";
}
function updateAddButtonState() {
    addButton.disabled = nameInput.value.trim().length === 0;
}
nameInput.addEventListener("input", updateAddButtonState);
form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (name.length === 0)
        return;
    clearAddError();
    addButton.disabled = true;
    try {
        await createHabit(name);
        nameInput.value = "";
        await renderHabits();
    }
    catch (err) {
        showAddError(err instanceof ApiError ? err.message : "failed to add habit");
    }
    finally {
        updateAddButtonState();
    }
});
function habitRow(habit) {
    const li = document.createElement("li");
    li.className = "habit-row";
    li.dataset.habitId = habit.id;
    const name = document.createElement("span");
    name.className = "habit-name";
    name.textContent = habit.name;
    const today = todayUtc();
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "today-toggle";
    let done = habit.todayDone;
    function renderToggle() {
        toggle.classList.toggle("done", done);
        toggle.classList.toggle("not-done", !done);
        toggle.textContent = done ? "Done today" : "Not done today";
    }
    renderToggle();
    const streak = document.createElement("span");
    streak.className = "streak";
    streak.textContent = `🔥 ${habit.currentStreak}  best ${habit.longestStreak}`;
    const rowError = document.createElement("p");
    rowError.className = "error";
    rowError.hidden = true;
    toggle.addEventListener("click", async () => {
        const previousDone = done;
        const nextDone = !previousDone;
        done = nextDone;
        renderToggle();
        rowError.hidden = true;
        toggle.disabled = true;
        try {
            await setEntry(habit.id, today, nextDone);
            await renderHabits();
        }
        catch (err) {
            done = previousDone;
            renderToggle();
            rowError.textContent = err instanceof ApiError ? err.message : "failed to update";
            rowError.hidden = false;
        }
        finally {
            toggle.disabled = false;
        }
    });
    li.append(name, toggle, streak, rowError);
    return li;
}
async function renderHabits() {
    const habits = await listHabits();
    habitList.innerHTML = "";
    emptyState.hidden = habits.length > 0;
    for (const habit of habits) {
        habitList.appendChild(habitRow(habit));
    }
}
renderHabits().catch((err) => {
    console.error("failed to load habits", err);
});
