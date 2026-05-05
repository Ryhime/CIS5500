import { Navigate, useLocation } from "react-router-dom";

/** Old /map and /safety URLs → city overview (map + safety live there now). */
export default function LegacyCityRedirect() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: "/cities", search }} replace />;
}
