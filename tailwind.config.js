module.exports={content:['./Hinova/**/*.{html,js}'],theme:{extend:{
 colors:{navy:'#FFFFFF','navy-mid':'#EEF5F5',cyan:'#1E6FD9',gold:'#B5823A',pearl:'#0B2F35',slate:'#4E6A6E'},
 fontFamily:{montserrat:['Montserrat','sans-serif'],inter:['Inter','sans-serif']},
 animation:{'fade-up':'fadeUp 0.7s ease forwards',glow:'glow 3s ease-in-out infinite',float:'float 6s ease-in-out infinite'},
 keyframes:{fadeUp:{'0%':{opacity:'0',transform:'translateY(30px)'},'100%':{opacity:'1',transform:'translateY(0)'}},
  glow:{'0%,100%':{boxShadow:'0 0 20px rgba(30,111,217,0.3)'},'50%':{boxShadow:'0 0 40px rgba(30,111,217,0.6)'}},
  float:{'0%,100%':{transform:'translateY(0px)'},'50%':{transform:'translateY(-12px)'}}}}}}
