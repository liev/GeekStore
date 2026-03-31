using GoblinSpot.Core.Models;
using System.Threading.Tasks;

namespace GoblinSpot.Application.Interfaces
{
    public interface IMoxfieldService
    {
        Task<MoxfieldDeckDto?> GetDeckByPublicIdAsync(string publicId);
    }
}
