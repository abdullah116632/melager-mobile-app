import { createAction, createSlice } from "@reduxjs/toolkit";

export interface DrawerState {
  isOpen: boolean;
}

type DrawerRootState = { drawer: DrawerState };

const initialState: DrawerState = {
  isOpen: false,
};

export const openDrawer = createAction("drawer/open");
export const closeDrawer = createAction("drawer/close");

const drawerSlice = createSlice({
  name: "drawer",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(openDrawer, (state) => {
        state.isOpen = true;
      })
      .addCase(closeDrawer, (state) => {
        state.isOpen = false;
      });
  },
});

export const selectDrawerIsOpen = (state: DrawerRootState) =>
  state.drawer.isOpen;

export default drawerSlice.reducer;
