import { memo } from 'react';

import ApplicationAppearance from './ApplicationAppearance';
import ChatAppearance from './ChatAppearance';
import CommonAppearance from './CommonAppearance';

const SettingsAppearance = memo(() => {
  return (
    <>
      <CommonAppearance />
      <ApplicationAppearance />
      <ChatAppearance />
    </>
  );
});

export default SettingsAppearance;
