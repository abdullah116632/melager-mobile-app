import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { DashboardMealType, TodaySchedule } from "@/types/dashboard";
import { getCurrentDate } from "@/utils/dashboard";

export interface MealMenuState {
  selectedDate: string;
  datePickerVisible: boolean;
  calendarYearMonth: string;
  calendarMarkers: Record<string, string[]>;
  calendarMarkersLoading: boolean;
  schedule: TodaySchedule | null;
  optOuts: string[];
  pendingOptOuts: string[];
}

type MealMenuRootState = { mealMenu: MealMenuState };

const today = getCurrentDate();

const initialState: MealMenuState = {
  selectedDate: today,
  datePickerVisible: false,
  calendarYearMonth: today.slice(0, 7),
  calendarMarkers: {},
  calendarMarkersLoading: false,
  schedule: null,
  optOuts: [],
  pendingOptOuts: [],
};

const mealMenuSlice = createSlice({
  name: "mealMenu",
  initialState,
  reducers: {
    setSelectedDate: (state, action: PayloadAction<string>) => {
      state.selectedDate = action.payload;
      state.schedule = null;
    },
    setDatePickerVisible: (state, action: PayloadAction<boolean>) => {
      state.datePickerVisible = action.payload;
    },
    setCalendarYearMonth: (state, action: PayloadAction<string>) => {
      state.calendarYearMonth = action.payload;
    },
    setCalendarMarkersLoading: (state, action: PayloadAction<boolean>) => {
      state.calendarMarkersLoading = action.payload;
    },
    setCalendarMarkers: (
      state,
      action: PayloadAction<Record<string, string[]>>,
    ) => {
      state.calendarMarkers = action.payload;
    },
    setSchedule: (state, action: PayloadAction<TodaySchedule | null>) => {
      state.schedule = action.payload;
      if (action.payload) state.optOuts = action.payload.myOptOuts;
    },
    setOptOuts: (state, action: PayloadAction<string[]>) => {
      state.optOuts = action.payload;
    },
    setPendingOptOut: (
      state,
      action: PayloadAction<{ mealType: DashboardMealType; pending: boolean }>,
    ) => {
      const { mealType, pending } = action.payload;
      state.pendingOptOuts = pending
        ? [...new Set([...state.pendingOptOuts, mealType])]
        : state.pendingOptOuts.filter((item) => item !== mealType);
    },
  },
});

export const {
  setSelectedDate,
  setDatePickerVisible,
  setCalendarYearMonth,
  setCalendarMarkersLoading,
  setCalendarMarkers,
  setSchedule,
  setOptOuts,
  setPendingOptOut,
} = mealMenuSlice.actions;

export const selectMealMenuState = (state: MealMenuRootState) =>
  state.mealMenu;

export default mealMenuSlice.reducer;
