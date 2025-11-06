// Form Handling and Toast Notifications

(function() {
  // Toast notification function
  function showToast(title, description, type = 'success') {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toast-title');
    const toastDescription = document.getElementById('toast-description');
    const toastIcon = document.getElementById('toast-icon');
    
    if (!toast) return;
    
    // Set content
    toastTitle.textContent = title;
    toastDescription.textContent = description;
    
    // Set icon and style based on type
    if (type === 'success') {
      toast.classList.remove('error');
      toast.classList.add('success');
      toastIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>';
    } else {
      toast.classList.remove('success');
      toast.classList.add('error');
      toastIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>';
    }
    
    // Show toast
    toast.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const btnText = document.getElementById('login-btn-text');
        
        // Disable button and show loading
        btnText.textContent = 'Signing in...';
        loginForm.querySelector('button[type="submit"]').disabled = true;
        
        // Simulate login
        setTimeout(() => {
          showToast('Login Successful', 'Welcome back to InvoiceAI!', 'success');
          
          // Reset button
          btnText.textContent = 'Sign In';
          loginForm.querySelector('button[type="submit"]').disabled = false;
          
          // Redirect after success (simulate)
          setTimeout(() => {
            // In a real app, you would redirect to dashboard
            console.log('Redirecting to dashboard...');
          }, 1000);
        }, 1000);
      });
    }

    // Signup Form
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
      signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const btnText = document.getElementById('signup-btn-text');
        
        // Validate passwords match
        if (password !== confirmPassword) {
          showToast('Passwords don\'t match', 'Please make sure your passwords match.', 'error');
          return;
        }
        
        // Disable button and show loading
        btnText.textContent = 'Creating account...';
        signupForm.querySelector('button[type="submit"]').disabled = true;
        
        // Simulate signup
        setTimeout(() => {
          showToast('Account Created!', 'Welcome to InvoiceAI. Let\'s get started!', 'success');
          
          // Reset button
          btnText.textContent = 'Create Account';
          signupForm.querySelector('button[type="submit"]').disabled = false;
          
          // Redirect after success (simulate)
          setTimeout(() => {
            // In a real app, you would redirect to dashboard
            console.log('Redirecting to dashboard...');
          }, 1000);
        }, 1000);
      });
    }
  });
})();
