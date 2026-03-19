using GeekStore.Core.Entities;
using GeekStore.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GeekStore.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CategoriesController : ControllerBase
    {
        private readonly GeekStoreDbContext _context;

        public CategoriesController(GeekStoreDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Category>>> GetCategories()
        {
            var rootCategories = await _context.Categories
                .Where(c => c.ParentId == null)
                .Include(c => c.Subcategories)
                .ToListAsync();
            return Ok(rootCategories);
        }

        [Authorize]
        [HttpPost]
        public async Task<ActionResult<Category>> AddCategory([FromBody] CategoryDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("El nombre no puede estar vacío");

            var category = new Category { Name = dto.Name };
            _context.Categories.Add(category);
            await _context.SaveChangesAsync();
            
            return Ok(category);
        }

        [Authorize]
        [HttpPost("{categoryId}/subcategories")]
        public async Task<ActionResult<Category>> AddSubcategory(int categoryId, [FromBody] SubcategoryDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("El nombre no puede estar vacío");

            var parentCategory = await _context.Categories.FindAsync(categoryId);
            if (parentCategory == null) return NotFound("Categoría no encontrada");

            var subcategory = new Category { Name = dto.Name, ParentId = categoryId };
            _context.Categories.Add(subcategory);
            await _context.SaveChangesAsync();

            return Ok(subcategory);
        }
    }

    public class CategoryDto
    {
        public string Name { get; set; } = string.Empty;
    }

    public class SubcategoryDto
    {
        public string Name { get; set; } = string.Empty;
    }
}
