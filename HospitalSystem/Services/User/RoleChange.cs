using HospitalSystem.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace HospitalSystem.Services.User;

// The only place a user's role is changed, so every endpoint that changes a
// role applies the same guards and invalidates the user's existing tokens.
internal static class RoleChange
{
    public static async Task<string?> ApplyAsync(
        ApplicationDbContext context,
        ICurrentUserService currentUser,
        UserEntity user,
        UserRole newRole)
    {
        // Demo roles can sign in without a password, so they are never handed
        // to an account through the API.
        if (!Enum.IsDefined(typeof(UserRole), newRole) ||
            newRole is UserRole.Pending or UserRole.DemoAdmin or UserRole.DemoFrontDesk)
            return "Invalid role";

        if (user.Role is UserRole.DemoAdmin or UserRole.DemoFrontDesk)
            return "Demo accounts cannot change role";

        if (user.Role == newRole)
            return "User already has this role";

        if (currentUser.UserId == user.Id.ToString())
            return "You cannot change your own role";

        if (user.Role == UserRole.Admin && newRole != UserRole.Admin)
        {
            var otherAdmins = await context.Users.CountAsync(u => u.Role == UserRole.Admin && u.Id != user.Id);
            if (otherAdmins == 0)
                return "Cannot demote the last remaining admin";
        }

        user.Role = newRole;
        user.SecurityStamp = Guid.NewGuid().ToString();
        return null;
    }
}
