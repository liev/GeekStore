namespace GeekStore.Core.Constants
{
    /// <summary>
    /// Jerarquía de planes Goblin Spot. Precios fijos en CRC (tipo de cambio ~450 CRC/USD).
    /// Worker Fundador: primeros 30 slots a ₡1,000. Después sube a ₡2,000.
    /// </summary>
    public static class SubscriptionPlans
    {
        public const string Worker  = "Goblin Worker";
        public const string Mage    = "Goblin Mage";
        public const string Warlord = "Goblin Warlord";
        public const string King    = "Goblin King";

        // Founder Worker (first 30 slots)
        public const decimal WorkerFounderCrc = 1000m;
        public const decimal WorkerFounderUsd = 2.22m;
        public const int     WorkerFounderLimit = 30;

        // Regular Worker (after founder slots are full)
        public const decimal WorkerRegularCrc = 2000m;
        public const decimal WorkerRegularUsd = 4.44m;

        public static readonly IReadOnlyDictionary<string, PlanInfo> Catalog =
            new Dictionary<string, PlanInfo>
            {
                [Worker]  = new("⚔",  Worker,  WorkerFounderCrc, WorkerFounderUsd, 20),
                [Mage]    = new("🧙", Mage,    3500m, 7.78m,  60),
                [Warlord] = new("⚔️", Warlord, 6500m, 14.44m, 150),
                [King]    = new("👑",  King,    12000m, 26.67m, int.MaxValue),
            };

        public static bool IsValid(string plan) => Catalog.ContainsKey(plan);

        public record PlanInfo(
            string Emoji,
            string Name,
            decimal CrcPrice,
            decimal UsdPrice,
            int MaxProducts
        );
    }
}
