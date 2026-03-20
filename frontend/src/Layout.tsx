import { Navigate, Outlet } from "react-router-dom";
import { useCurrentUserStore } from "./modules/auth/current-user.state";
import { useRoleStore } from "./modules/role/role.state";

const Layout = () => {
  const currentUser = useCurrentUserStore();
  const roleStore = useRoleStore();

  if (currentUser.currentUser == null)
    return <Navigate replace to={"/signin"} />;

  if (roleStore.role == null) return <Navigate replace to={"/role"} />;

  return (
    <>
      <Outlet />
    </>
  );
};
export default Layout;
