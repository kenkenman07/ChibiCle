import { Navigate, Outlet } from "react-router-dom";
import { useCurrentUserStore } from "./modules/auth/current-user.state";

const Layout = () => {
  const currentUser = useCurrentUserStore();

  if (currentUser.currentUser == null)
    return <Navigate replace to={"/signin"} />;

  return (
    <div>
      <Outlet />
    </div>
  );
};
export default Layout;
