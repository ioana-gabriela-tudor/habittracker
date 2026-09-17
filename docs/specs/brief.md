# Habit Tracker

## Summary

Build a simple habit tracking application for a small, user-defined set of habits (e.g., "exercise," "read"). Each day, the user marks each habit as done or not done. The app computes, per habit, the current streak (consecutive days marked done, ending today or yesterday) and the longest streak ever achieved.

## Acceptance Criteria

1. Users can define a small set of habits, each with a unique name.
2. For any given day, users can mark a habit as done or not done, and toggle that status; each habit has at most one status per day.
3. For each habit, the app displays the current streak: the number of consecutive days ending today (or yesterday, if today is not yet marked) that are marked done. A day marked not done, or unmarked, breaks the streak.
4. For each habit, the app displays the longest streak ever recorded, even after the current streak breaks.
5. Habit definitions and daily statuses persist between application restarts.