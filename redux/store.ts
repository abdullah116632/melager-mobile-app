import { configureStore, type Action, type ThunkAction } from "@reduxjs/toolkit";

import authReducer from "@/redux/slice/authSlice";
import drawerReducer from "@/redux/slice/drawerSlice";
import messReducer from "@/redux/slice/messSlice";
import networkReducer from "@/redux/slice/networkSlice";
import notificationReducer from "@/redux/slice/notificationSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    drawer: drawerReducer,
    mess: messReducer,
    network: networkReducer,
    notification: notificationReducer,
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
