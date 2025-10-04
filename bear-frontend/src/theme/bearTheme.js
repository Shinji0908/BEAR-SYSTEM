import { createTheme } from '@mui/material/styles';


const bearColors = {

  black: '#000000',
  white: '#FFFFFF',
  red: '#cd0404',
  darkRed: '#9f0505',
  blue: '#12212F',
  body: '#f2e9da',        
  semiwhite: '#f2f2f2',   
  yellow: '#f5c45e',     
  transparent: '#00000000',
  
 
  statusPending: '#FFA500',   
  statusApproved: '#4CAF50',  
  statusRejected: '#F44336',  
  
  
  main: '#12212F',        
  mainLight: '#f2f2f2',   
  mainDark: '#000000',    
  mainDarkVariant: '#f5c45e', 
};

// Create BEAR System Theme
const bearTheme = createTheme({
  palette: {
    primary: {
      main: bearColors.blue,        // #12212F
      light: bearColors.semiwhite,  // #f2f2f2
      dark: bearColors.black,       // #000000
      contrastText: bearColors.white,
    },
    secondary: {
      main: bearColors.yellow,      // #f5c45e
      light: bearColors.semiwhite,
      dark: bearColors.darkRed,     // #9f0505
      contrastText: bearColors.black,
    },
    error: {
      main: bearColors.red,         // #cd0404
      dark: bearColors.darkRed,     // #9f0505
    },
    warning: {
      main: bearColors.statusPending, // #FFA500
    },
    success: {
      main: bearColors.statusApproved, // #4CAF50
    },
    background: {
      default: bearColors.body,     // #f2e9da
      paper: bearColors.white,      // #FFFFFF
    },
    text: {
      primary: bearColors.black,    // #000000
      secondary: bearColors.blue,   // #12212F
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 'bold',
      color: bearColors.blue,
    },
    h2: {
      fontWeight: 'bold',
      color: bearColors.blue,
    },
    h3: {
      fontWeight: 'bold',
      color: bearColors.blue,
    },
    h4: {
      fontWeight: 'bold',
      color: bearColors.blue,
    },
    h5: {
      fontWeight: 'bold',
      color: bearColors.blue,
    },
    h6: {
      fontWeight: 'bold',
      color: bearColors.blue,
    },
    button: {
      fontWeight: 'bold',
      textTransform: 'none',
    },
  },
  components: {

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 'bold',
          textTransform: 'none',
          padding: '8px 16px',
        },
        contained: {
          backgroundColor: bearColors.red,
          color: bearColors.white,
          '&:hover': {
            backgroundColor: bearColors.darkRed,
          },
        },
        outlined: {
          borderColor: bearColors.blue,
          color: bearColors.blue,
          '&:hover': {
            borderColor: bearColors.blue,
            backgroundColor: bearColors.semiwhite,
          },
        },
      },
    },
 
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: bearColors.white,
          borderRadius: 16,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          border: `1px solid ${bearColors.semiwhite}`,
        },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: bearColors.blue,
          color: bearColors.white,
        },
      },
    },

    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: bearColors.white,
            borderRadius: 8,
            '& fieldset': {
              borderColor: bearColors.blue,
              borderWidth: 2,
            },
            '&:hover fieldset': {
              borderColor: bearColors.blue,
            },
            '&.Mui-focused fieldset': {
              borderColor: bearColors.blue,
            },
          },
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: bearColors.white,
          borderRadius: 12,
        },
      },
    },
  },
});

export default bearTheme;
export { bearColors };
