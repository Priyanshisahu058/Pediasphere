function shopCategory(category) {
  // This function will redirect to category-specific product pages
  // You'll implement Amazon affiliate product listings here
  console.log(`Shopping for: ${category}`);
  
  // Example implementation:
  switch(category) {
    case 'baby-food':
      // Redirect to baby food products page or show products
      alert('Loading baby food products...');
      break;
    case 'supplements':
      alert('Loading vitamins & supplements...');
      break;
    case 'care-products':
      alert('Loading baby care products...');
      break;
    case 'health-devices':
      alert('Loading health monitoring devices...');
      break;
    default:
      alert('Category coming soon!');
  }
}

function openAIChat() {
  // This will open your existing Groq AI chatbot
  // But now focused on product recommendations
  console.log('Opening AI Shopping Assistant...');
  alert('AI Shopping Assistant coming soon! This will integrate with your existing Groq chatbot.');
  
  // You can redirect to your existing chatbot page or open it in a modal
  // window.location.href = 'chatbot.html';
}

// Add some interactive effects
document.addEventListener('DOMContentLoaded', function() {
  const cards = document.querySelectorAll('.category-card');
  
  cards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-8px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0) scale(1)';
    });
  });
});
function openConsultForm() {
  // Redirect to your original doctor consultation form
  window.location.href = 'consult.html';
  
  // OR open in a modal/popup
  // You can implement modal functionality here
}