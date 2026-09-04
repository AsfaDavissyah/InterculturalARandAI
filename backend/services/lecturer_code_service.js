async function migrateLecturerCode({ UserModel, lecturer, nextCode }) {
  const previousCode = lecturer.lecturerCode;
  const linkedStudents = previousCode
    ? await UserModel.updateMany(
      { role: "student", studentLecturerCode: previousCode },
      { $set: { studentLecturerCode: nextCode } }
    )
    : { modifiedCount: 0 };

  try {
    lecturer.lecturerCode = nextCode;
    await lecturer.save();
  } catch (error) {
    if (previousCode) {
      await UserModel.updateMany(
        { role: "student", studentLecturerCode: nextCode },
        { $set: { studentLecturerCode: previousCode } }
      );
    }
    lecturer.lecturerCode = previousCode;
    throw error;
  }

  return {
    previousCode,
    nextCode,
    migratedStudents: linkedStudents.modifiedCount || 0,
  };
}

module.exports = { migrateLecturerCode };
