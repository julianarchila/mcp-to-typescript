export type UserRoles = {
  username: string;
  roles?: ("admin" | "moderator" | "user" | "guest")[];
};


const adminUser: UserRoles = {
  username: "pepito",
  roles: ["admin", "moderator"]
}
