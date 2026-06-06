import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import { RoomProvider } from "./lib/room-context";
import Layout from "./pages/_layout";
import HomePage from "./pages/index";
import HowToPlayPage from "./pages/how-to-play";
import MultiplayerPage from "./pages/multiplayer";
import OnlinePage from "./pages/online";
import RoomPage from "./pages/room";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <RoomProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="online" element={<OnlinePage />} />
              <Route path="room/:code" element={<RoomPage />} />
              <Route path="multiplayer" element={<MultiplayerPage />} />
              <Route path="how-to-play" element={<HowToPlayPage />} />
            </Route>
          </Routes>
        </RoomProvider>
      </Router>
      <Analytics />
    </QueryClientProvider>
  );
}

export default App;
