
function generateTimetable(tasks, slots, rooms) {
    const assignments = [];

    const occupiedFaculty = new Set();
    const occupiedSections = new Set();
    const occupiedRooms = new Set();

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

        for (const slot of slots) {
            const facultyKey = `${task.faculty_id}-${slot.id}`;
            const sectionKey = `${task.section_id}-${slot.id}`;

            if (occupiedFaculty.has(facultyKey)) continue;
            if (occupiedSections.has(sectionKey)) continue;

            for (const room of rooms) {
                const roomKey = `${room.id}-${slot.id}`;

                if (occupiedRooms.has(roomKey)) continue;

                if (Number(room.capacity) < Number(task.student_count)) {
                    continue;
                }

                if (
                    Boolean(Number(task.requires_lab)) &&
                    room.room_type !== "LAB"
                ) {
                    continue;
                }

                const assignment = {
                    section_id: task.section_id,
                    subject_id: task.subject_id,
                    faculty_id: task.faculty_id,
                    room_id: room.id,
                    time_slot_id: slot.id
                };

                assignments.push(assignment);

                occupiedFaculty.add(facultyKey);
                occupiedSections.add(sectionKey);
                occupiedRooms.add(roomKey);

                if (solve(index + 1)) {
                    return true;
                }

                assignments.pop();

                occupiedFaculty.delete(facultyKey);
                occupiedSections.delete(sectionKey);
                occupiedRooms.delete(roomKey);
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
                : "No valid timetable found. Check room capacity, faculty and time slots."
        };
    }

    return {
        success: true,
        assignments,
        message: "Conflict-free timetable generated successfully."
    };
}

module.exports = generateTimetable;
