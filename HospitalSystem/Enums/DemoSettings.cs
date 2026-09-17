namespace HospitalSystem.Enums;

public class DemoSettings
{
    // Off unless a deployment opts in. Only turn it on where the data is fake:
    // demo-login hands out tokens without a password.
    public bool Enabled { get; set; }
    public string? AdminUserName { get; set; }
    public string? FrontDeskUserName { get; set; }
}
