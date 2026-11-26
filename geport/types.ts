export interface CoverData {
  title: string;
  course: string; // Often "Lab Report" acts as main title, but sometimes course name is needed
  className: string;
  studentId: string;
  name: string;
  department: string;
  dateYear: string;
  dateMonth: string;
  dateDay: string;
  headerImage: string | null; // Data URL for the University Name calligraphy
  logoImage: string | null;   // Data URL for the University Seal
}

export interface SmartLineConfig {
  titleMinWidth: string;
  fieldMinWidth: string;
}
