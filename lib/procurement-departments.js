'use strict';

const MSU_DEPARTMENTS = Object.freeze([
  "College of Agriculture",
  "College of Business Administration and Accountancy (CBAA)",
  "College of Education (CED)",
  "College of Engineering",
  "College of Fisheries & Aquatic Sciences",
  "College of Health Sciences",
  "College of Law",
  "College of Medicine",
  "College of Natural Sciences and Mathematics (CNSM)",
  "College of Social Sciences and Humanities (CSSH)",
  "Institute of Islamic, Arabic, and International Studies (IIAIS)",
]);

function normalizeMSUDepartment(value) {
  const department = String(value || "").replace(/\s+/g, " ").trim();
  if (!department) return "";

  const normalized = department.toLocaleLowerCase();
  const match = MSU_DEPARTMENTS.find((officialName) => {
    const official = officialName.toLocaleLowerCase();
    const officialWithoutCode = officialName.replace(/\s*\([^)]*\)\s*$/, "").toLocaleLowerCase();
    return normalized === official || normalized === officialWithoutCode;
  });

  return match || department;
}

module.exports = {
  MSU_DEPARTMENTS,
  normalizeMSUDepartment,
};
