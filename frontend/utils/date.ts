import moment from 'moment';

export const toCalendar = (date: Date): string => {
  return moment(date).calendar();
};
