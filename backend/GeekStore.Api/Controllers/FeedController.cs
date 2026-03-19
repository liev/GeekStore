using GeekStore.Core.Entities;
using GeekStore.Core.Interfaces;
using GeekStore.Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace GeekStore.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FeedController : ControllerBase
    {
        private readonly IUserFollowRepository _userFollowRepository;
        private readonly IProductRepository _productRepository;

        public FeedController(IUserFollowRepository userFollowRepository, IProductRepository productRepository)
        {
            _userFollowRepository = userFollowRepository;
            _productRepository = productRepository;
        }

        [HttpGet("following")]
        [Authorize]
        public async Task<ActionResult<PagedResult<Product>>> GetFollowingFeed([FromQuery] ProductQueryParams query)
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdStr, out int userId)) return Unauthorized();

            var follows = await _userFollowRepository.GetFollowingAsync(userId);
            if (!follows.Any()) 
            {
                return Ok(new PagedResult<Product> { Items = new List<Product>(), TotalCount = 0, Page = 1, PageSize = query.PageSize });
            }

            var sellerIds = follows.Select(f => f.FollowedId).ToList();

            var pagedResult = await _productRepository.GetProductsBySellersAsync(sellerIds, query.Page, query.PageSize);
            return Ok(pagedResult);
        }
    }
}
