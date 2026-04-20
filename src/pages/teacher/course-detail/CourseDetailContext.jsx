import { createContext, useContext } from 'react';

export const CourseDetailContext = createContext(null);

export const useCourseDetail = () => {
  const context = useContext(CourseDetailContext);
  if (!context) {
    throw new Error('useCourseDetail must be used within a CourseDetailContext.Provider');
  }
  return context;
};
