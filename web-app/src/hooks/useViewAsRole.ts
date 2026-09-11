import { useContext } from "react";
import { ViewAsRoleContext } from "../view-as-role-context";
import type { ViewAsRoleContextValue } from "../view-as-role-context";

export function useViewAsRole(): ViewAsRoleContextValue {
  return useContext(ViewAsRoleContext);
}
