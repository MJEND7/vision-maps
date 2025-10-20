export enum ViewMode {
    CHANNEL = "channel",
    FRAME = "frame",
    SETTINGS = "Settings"
}

export type SidebarState = {
    leftWidth: number;
    rightWidth: number;
    leftCollapsed: boolean;
    rightCollapsed: boolean;
    leftOpen: boolean;
    rightOpen: boolean;
};

export type TabStore = { title: string, id: string, type: ViewMode, parent?: string }
