import { BrowserRouter } from "react-router-dom";
import Routes from "./Routes";

import { QueryProvider, PolarisProvider } from "./components";

export default function App() {
  // Any .tsx or .jsx files in /pages will become a route
  // See documentation for <Routes /> for more info
  const pages = import.meta.glob("./pages/**/*.jsx", {
    eager: true,
  });

  console.log("App: Pages loaded:", Object.keys(pages));
  console.log("App: Current URL:", window.location.pathname);

  return (
    <PolarisProvider>
      <BrowserRouter>
        <QueryProvider>
          <Routes pages={pages} />
        </QueryProvider>
      </BrowserRouter>
    </PolarisProvider>
  );
}
