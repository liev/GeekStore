namespace GoblinSpot.Core.Interfaces
{
    public interface IPayPalService
    {
        /// <summary>
        /// Verifies a PayPal order was successfully captured (status == COMPLETED).
        /// Returns true if the order is valid and completed.
        /// </summary>
        Task<bool> VerifyOrderAsync(string orderId);
    }
}
