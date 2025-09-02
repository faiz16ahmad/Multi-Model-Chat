import { Provider } from 'jotai';
import ChatApp from './components/ChatApp';

export default function Page() {
  return (
    <Provider>
      <ChatApp />
    </Provider>
  );
}