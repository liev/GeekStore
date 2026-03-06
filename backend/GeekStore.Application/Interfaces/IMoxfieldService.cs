using GeekStore.Core.Models;
using System.Threading.Tasks;

namespace GeekStore.Application.Interfaces
{
    public interface IMoxfieldService
    {
        Task<MoxfieldDeckDto?> GetDeckByPublicIdAsync(string publicId);
    }
}
