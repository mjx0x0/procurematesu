'use strict';

const MSU_DEPARTMENTS = Object.freeze([
  "College of Agriculture",
  "College of Business Administration and Accountancy (CBAA)",
  "College of Education (COED)",
  "College of Engineering",
  "College of Fisheries & Aquatic Sciences",
  "College of Health Sciences",
  "College of Law",
  "College of Medicine",
  "College of Natural Sciences and Mathematics (CNSM)",
  "College of Social Sciences and Humanities (CSSH)",
  "Institute of Islamic, Arabic, and International Studies (IIAIS)",
  "Office of the Chancellor",
  "Office of the Campus Secretary",
  "Legal Services Office",
  "Internal Audit Services",
  "Data Protection Officer",
  "Records Management Office",
  "Budget Office",
  "Civil Security Unit",
  "Office of the Vice Chancellor for Academic Affairs",
  "Office of the Vice Chancellor for Student Affairs and Services",
  "Office of the University Registrar",
  "Admission Office",
  "University Library",
  "Guidance Office",
  "Medical Services",
  "Scholarship Coordinating Office",
  "Office of the National Services Training Program (NSTP)",
  "Center for Curriculum Studies and Instructional Designing",
  "Center for Instructional Materials for Development",
  "Information and Communications Technology Office (ICTO)",
  "University Press and Communications Office",
  "Office of International Affairs",
  "Alumni Relations Office",
  "Institute for Peace and Development in Mindanao (IPDM)",
  "Center for Women's Studies",
  "Quality Assurance Management Services",
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

  // Accept the former acronym on legacy saved drafts/links, but always return
  // the current official display name.
  if (!match && /^college of education(?:\s*\(ced\))?$/i.test(department)) {
    return "College of Education (COED)";
  }

  return match || department;
}

module.exports = {
  MSU_DEPARTMENTS,
  normalizeMSUDepartment,
};
