import { registerPlugin } from '@capacitor/core';

interface AdminEscapePlugin {
  exitKiosk(): Promise<void>;
}

const AdminEscape = registerPlugin<AdminEscapePlugin>('AdminEscape');

export { AdminEscape };
