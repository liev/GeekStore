using System;

namespace GoblinSpot.Core.Entities
{
    public class DeliveryPoint
    {
        public int Id { get; set; }
        
        // e.g. "Tienda Fenix", "Vortex", "Pinky"
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string LocationUrl { get; set; } = string.Empty;
        
        public bool IsActive { get; set; } = true;
    }
}
