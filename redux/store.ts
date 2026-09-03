import {
  configureStore,
  type Action,
  type ThunkAction,
} from "@reduxjs/toolkit";

import authReducer from "@/redux/slice/authSlice";
import bazarReducer from "@/redux/slice/bazarSlice";
import depositsReducer from "@/redux/slice/depositsSlice";
import drawerReducer from "@/redux/slice/drawerSlice";
import expenseReducer from "@/redux/slice/expenseSlice";
import mealsReducer from "@/redux/slice/mealsSlice";
import messReducer from "@/redux/slice/messSlice";
import networkReducer from "@/redux/slice/networkSlice";
import notificationReducer from "@/redux/slice/notificationSlice";
import noticesReducer from "@/redux/slice/noticesSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    bazar: bazarReducer,
    deposits: depositsReducer,
    drawer: drawerReducer,
    expenses: expenseReducer,
    meals: mealsReducer,
    mess: messReducer,
    network: networkReducer,
    notification: notificationReducer,
    notices: noticesReducer,
  },
});

export type AppStore = typeof store;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action
>;
