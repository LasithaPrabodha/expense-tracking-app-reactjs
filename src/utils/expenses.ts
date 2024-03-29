import {Expense} from '../models/expense';
import {ExpensesGroup} from '../types/expenses-group';
import {Recurrence} from '../types/recurrence';
import {format, isThisYear, isToday, isYesterday} from 'date-fns';
import {calculateRange} from './date';

export const getGroupedExpenses = (
  expenses: Expense[],
  recurrence: Recurrence,
) => {
  const filteredExpenses = filterExpensesInPeriod(expenses, recurrence, 0);

  return groupExpensesByDay(filteredExpenses);
};

export const filterExpensesInPeriod = (
  expenses: Expense[],
  period: Recurrence,
  periodIndex: number,
) => {
  const {start, end} = calculateRange(period, periodIndex);

  return expenses.filter(expense => {
    const {date} = expense;
    return date >= start && date <= end;
  });
};

export const groupExpensesByDay = (expenses: Expense[]): ExpensesGroup[] => {
  expenses.sort((a, b) => {
    return b.date.getTime() - a.date.getTime();
  });

  const groupedExpenses: {[key: string]: Expense[]} = expenses.reduce(
    (prev: {[key: string]: Expense[]}, curr: Expense) => {
      const {date} = curr;
      let key = '';
      if (isToday(date)) {
        key = 'Today';
      } else if (isYesterday(date)) {
        key = 'Yesterday';
      } else if (isThisYear(date)) {
        key = format(date, 'E, d MMM');
      } else {
        key = format(date, 'E, d MMM yyyy');
      }

      if (!prev[key]) {
        prev[key] = [];
      }

      prev[key].push(curr);

      return prev;
    },
    {},
  );

  return Object.keys(groupedExpenses).map(key => ({
    day: key,
    expenses: groupedExpenses[key],
    total: groupedExpenses[key].reduce(
      (acc, expense) => acc + expense.amount,
      0,
    ),
  }));
};
