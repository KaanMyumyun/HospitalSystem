    public class AppointmentsEntity
    {
        public int Id { get; set; }
        public AppointmentStatus Status { get; set; }
        public DateTime TimeOfAppointment { get; set; }
        public DateTime CreatedAt { get; set; }

        public int CreatedByTheFrontDeskId { get; set; }
        public UserEntity CreatedByTheFrontDesk { get; set; }

        public int PatientId { get; set; }
        public PatientEntity Patient { get; set; }

        public int DoctorId { get; set; }
        public DoctorEntity Doctor { get; set; }

    }
