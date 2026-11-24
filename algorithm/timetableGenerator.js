
function generateTimetable(tasks, slots, rooms) {
    const assignments = [];

    const occupiedFaculty = new Set();
    const occupiedSections = new Set();
    const occupiedRooms = new Set();
    const dailySectionCount = new Map();

    let attempts = 0;
    const MAX_ATTEMPTS = 250000;

    // Expand weekly hours into individual classes
    const classes = [];

    for (const task of tasks) {
        for (let i = 0; i < Number(task.weekly_hours); i++) {
            classes.push({
                ...task,
                classNumber: i + 1
            });
        }
    }

    // Schedule lab classes first
    classes.sort((a, b) =>
        Number(b.requires_lab) - Number(a.requires_lab)
    );

    function solve(index) {
        if (index === classes.length) {
            return true;
        }

        if (++attempts > MAX_ATTEMPTS) {
            return false;
        }

        const task = classes[index];

        // Try less-loaded days first
        const orderedSlots = [...slots].sort((a, b) => {
            const countA = dailySectionCount.get(
                `${task.section_id}-${a.day}`
            ) || 0;

            const countB = dailySectionCount.get(
                `${task.section_id}-${b.day}`
            ) || 0;

            return countA - countB;
        });

        for (const slot of orderedSlots) {
            const facultyKey = `${task.faculty_id}-${slot.id}`;
            const sectionKey = `${task.section_id}-${slot.id}`;
            const roomKeyPrefix = `${slot.id}`;

            if (occupiedFaculty.has(facultyKey)) continue;
            if (occupiedSections.has(sectionKey)) continue;

            for (const room of rooms) {
                const roomKey = `${room.id}-${roomKeyPrefix}`;

                if (occupiedRooms.has(roomKey)) continue;

                // Check seating capacity
                if (Number(room.capacity) < Number(task.student_count)) {
                    continue;
                }

                // Lab subjects must use labs with enough equipment
                if (Boolean(Number(task.requires_lab))) {
                    if (room.room_type !== "LAB") continue;

                    if (
                        Number(room.equipment_count || 0) <
                        Number(task.student_count)
                    ) {
                        continue;
                    }
                } else {
                    // Normal subjects must use classrooms
                    if (room.room_type !== "CLASSROOM") continue;
                }

                const assignment = {
                    section_id: task.section_id,
                    subject_id: task.subject_id,
                    faculty_id: task.faculty_id,
                    room_id: room.id,
                    time_slot_id: slot.id
                };

                const dayKey = `${task.section_id}-${slot.day}`;

                assignments.push(assignment);

                occupiedFaculty.add(facultyKey);
                occupiedSections.add(sectionKey);
                occupiedRooms.add(roomKey);

                dailySectionCount.set(
                    dayKey,
                    (dailySectionCount.get(dayKey) || 0) + 1
                );

                if (solve(index + 1)) {
                    return true;
                }

                assignments.pop();

                occupiedFaculty.delete(facultyKey);
                occupiedSections.delete(sectionKey);
                occupiedRooms.delete(roomKey);

                const count = dailySectionCount.get(dayKey) - 1;

                if (count === 0) {
                    dailySectionCount.delete(dayKey);
                } else {
                    dailySectionCount.set(dayKey, count);
                }
            }
        }

        return false;
    }

    const success = solve(0);

    if (!success) {
        return {
            success: false,
            message: attempts > MAX_ATTEMPTS
                ? "Scheduling search limit reached. Try adding more resources."
                : "No valid timetable found. Check room capacity, lab equipment, faculty and time slots."
        };
    }

    return {
        success: true,
        assignments,
        message: "Balanced, conflict-free timetable generated successfully."
    };
}

module.exports = generateTimetable;
