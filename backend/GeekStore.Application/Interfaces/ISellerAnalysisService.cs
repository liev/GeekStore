using System.Collections.Generic;
using System.Threading.Tasks;
using GeekStore.Core.Models;

namespace GeekStore.Application.Interfaces
{
    public interface ISellerAnalysisService
    {
        Task<SellerAIAnalysisDto> AnalyzeSellersAsync(List<SellerStatDto> sellers);
    }
}
