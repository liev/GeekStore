using System.Collections.Generic;
using System.Threading.Tasks;
using GoblinSpot.Core.Models;

namespace GoblinSpot.Application.Interfaces
{
    public interface ISellerAnalysisService
    {
        Task<SellerAIAnalysisDto> AnalyzeSellersAsync(List<SellerStatDto> sellers);
    }
}
