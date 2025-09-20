 import { Routes as ReactRouterRoutes, Route, Navigate } from "react-router-dom";

/**
 * File-based routing.
 * @desc File-based routing that uses React Router under the hood.
 * To create a new route create a new .jsx file in `/pages` with a default export.
 *
 * Some examples:
 * * `/pages/index.jsx` matches `/`
 * * `/pages/blog/[id].jsx` matches `/blog/123`
 * * `/pages/[...catchAll].jsx` matches any URL not explicitly matched
 *
 * @param {object} pages value of import.meta.glob(). See https://vitejs.dev/guide/features.html#glob-import
 *
 * @return {Routes} `<Routes/>` from React Router, with a `<Route/>` for each file in `pages`
 */
export default function Routes({ pages }) {
  const routes = generateRoutes(pages);
  
  console.log("Rendering routes:", routes);
  
  const routeComponents = routes.map(({ path, component: Component }) => {
    console.log(`Creating route component for path: ${path}`);
    return (
      <Route key={path} path={path} element={<Component />} />
    );
  });

  const NotFound = routes.find(({ path }) => path === "/notFound")?.component || (() => (
    <div>Page not found</div>
  ));

  console.log("Route components:", routeComponents.length);
  console.log("NotFound component:", !!NotFound);

  return (
    <ReactRouterRoutes future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {routeComponents}
      <Route path="/exitiframe" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </ReactRouterRoutes>
  );
}

function generateRoutes(pages) {
  console.log("Pages object:", pages);
  const routes = Object.keys(pages)
    .map((key) => {
      let path = key
        .replace("./pages", "")
        .replace(/\.(t|j)sx?$/, "")
        /**
         * Replace /index with /
         */
        .replace(/\/index$/i, "/")
        /**
         * Only lowercase the first letter. This allows the developer to use camelCase
         * dynamic paths while ensuring their standard routes are normalized to lowercase.
         */
        .replace(/\b[A-Z]/, (firstLetter) => firstLetter.toLowerCase())
        /**
         * Convert /[handle].jsx to /:handle.jsx for react-router-dom
         */
        .replace(/\[(\w+?)\]/g, (_match, param) => `:${param}`);

      // Debug the path transformation
      console.log(`Path transformation: ${key} -> ${path}`);

      if (path.endsWith("/") && path !== "/") {
        path = path.substring(0, path.length - 1);
      }

      // Ensure root path is properly handled
      if (path === "") {
        path = "/";
      }

      const module = pages[key];
      const component = module?.default;
      const hasComponent = !!component;

      if (!hasComponent) {
        console.warn(`${key} doesn't export a default React component`, {
          module,
          keys: Object.keys(module || {}),
          default: module?.default,
          type: typeof module?.default
        });
      }

      console.log(`Generated route: ${path} from ${key}, hasComponent: ${hasComponent}`);

      return {
        path,
        component,
        hasComponent,
      };
    })
    .filter((route) => route.hasComponent)
    .map(({ path, component }) => ({ path, component }));

  console.log("Final routes:", routes);
  return routes;
}
