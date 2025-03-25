var e=this&&this.__awaiter||function(e,t,r,n){return new(r||(r=Promise))((function(a,i){function s(e){try{l(n.next(e))}catch(e){i(e)}}function o(e){try{l(n.throw(e))}catch(e){i(e)}}function l(e){var t;e.done?a(e.value):(t=e.value,t instanceof r?t:new r((function(e){e(t)}))).then(s,o)}l((n=n.apply(e,t||[])).next())}))},t=this&&this.__generator||function(e,t){var r,n,a,i={label:0,sent:function(){if(1&a[0])throw a[1];return a[1]},trys:[],ops:[]},s=Object.create(("function"==typeof Iterator?Iterator:Object).prototype);return s.next=o(0),s.throw=o(1),s.return=o(2),"function"==typeof Symbol&&(s[Symbol.iterator]=function(){return this}),s;function o(o){return function(l){return function(o){if(r)throw new TypeError("Generator is already executing.");for(;s&&(s=0,o[0]&&(i=0)),i;)try{if(r=1,n&&(a=2&o[0]?n.return:o[0]?n.throw||((a=n.return)&&a.call(n),0):n.next)&&!(a=a.call(n,o[1])).done)return a;switch(n=0,a&&(o=[2&o[0],a.value]),o[0]){case 0:case 1:a=o;break;case 4:return i.label++,{value:o[1],done:!1};case 5:i.label++,n=o[1],o=[0];continue;case 7:o=i.ops.pop(),i.trys.pop();continue;default:if(!(a=i.trys,(a=a.length>0&&a[a.length-1])||6!==o[0]&&2!==o[0])){i=0;continue}if(3===o[0]&&(!a||o[1]>a[0]&&o[1]<a[3])){i.label=o[1];break}if(6===o[0]&&i.label<a[1]){i.label=a[1],a=o;break}if(a&&i.label<a[2]){i.label=a[2],i.ops.push(o);break}a[2]&&i.ops.pop(),i.trys.pop();continue}o=t.call(e,i)}catch(e){o=[6,e],n=0}finally{r=a=0}if(5&o[0])throw o[1];return{value:o[0]?o[1]:void 0,done:!0}}([o,l])}}};Object.defineProperty(exports,"__esModule",{value:!0});var r=require("cheerio"),n=require("@libs/fetch"),a=require("@libs/novelStatus"),i=require("@libs/defaultCover"),s=new(function(){function s(e){var t;this.imageRequestInit={headers:{"Alt-Used":"www.mtlnovels.com"}},this.id=e.id,this.name=e.sourceName,this.icon="multisrc/mtlnovel/mtlnovel/icon.png",this.site=e.sourceSite,this.mainUrl="https://www.mtlnovels.com/",this.version="1.1.3",this.options=null!==(t=e.options)&&void 0!==t?t:{},this.filters=e.filters}return s.prototype.safeFecth=function(r){return e(this,arguments,void 0,(function(e,r){var a;return void 0===r&&(r=new Headers),t(this,(function(t){switch(t.label){case 0:return r.append("Alt-Used","www.mtlnovels.com"),[4,(0,n.fetchApi)(e,{headers:r})];case 1:if(!(a=t.sent()).ok)throw new Error("Could not reach site ("+a.status+") try to open in webview.");return[2,a]}}))}))},s.prototype.popularNovels=function(n,a){return e(this,arguments,void 0,(function(e,n){var a,s,o,l,c=this,u=n.filters,h=n.showLatestNovels;return t(this,(function(t){switch(t.label){case 0:return a="".concat(this.site,"novel-list/?"),u&&(a+="orderby=".concat(u.order.value),a+="&order=".concat(u.sort.value),a+="&status=".concat(u.storyStatus.value)),h&&(a+="&m_orderby=date"),a+="&pg=".concat(e),[4,this.safeFecth(a).then((function(e){return e.text()}))];case 1:return s=t.sent(),o=(0,r.load)(s),l=[],o("div.box.wide").each((function(e,t){var r=o(t).find("a.list-title").text().trim(),n=o(t).find("amp-img").attr("src");n&&"https://www.mtlnovel.net/no-image.jpg.webp"!=n||(n=i.defaultCover);var a=o(t).find("a.list-title").attr("href");if(a){var s={name:r,cover:n,path:a.replace(c.mainUrl,"").replace(c.site,"")};l.push(s)}})),[2,l]}}))}))},s.prototype.parseNovel=function(n){return e(this,void 0,void 0,(function(){var s,o,l,c,u,h,p,f,v=this;return t(this,(function(d){switch(d.label){case 0:return(s=new Headers).append("Referer","".concat(this.site,"novel-list/")),[4,this.safeFecth(this.site+n,s).then((function(e){return e.text()}))];case 1:return o=d.sent(),l=(0,r.load)(o),c={path:n,name:l("h1.entry-title").text().trim()||"Untitled",cover:l(".nov-head > amp-img").attr("src")||i.defaultCover,summary:l("div.desc > h2").next().text().trim(),chapters:[]},l(".info tr").each((function(e,t){var r=l(t).find("td").eq(0).text().trim(),n=l(t).find("td").eq(2).text().trim();switch(r){case"Genre":case"Tags":case"Mots Clés":case"Género":case"Label":case"Gênero":case"Tag":case"Теги":c.genres?c.genres+=", "+n:c.genres=n;break;case"Author":case"Auteur":case"Autor(a)":case"Autor":case"Автор":c.author=n;break;case"Status":case"Statut":case"Estado":case"Положение дел":c.status="Hiatus"==n?a.NovelStatus.OnHiatus:n}})),u=this.site+n+"chapter-list/",h=function(){return e(v,void 0,void 0,(function(){var e,n,a=this;return t(this,(function(t){switch(t.label){case 0:return[4,this.safeFecth(u,s).then((function(e){return e.text()}))];case 1:return e=t.sent(),l=(0,r.load)(e),n=[],l("div.ch-list").find("a.ch-link").each((function(e,t){var r=l(t).text().replace("~ ",""),i=l(t).attr("href");i&&n.push({path:i.replace(a.mainUrl,"").replace(a.site,""),name:r,releaseTime:null})})),[2,n.reverse()]}}))}))},p=c,[4,h()];case 2:return p.chapters=d.sent(),c.genres&&((f=c.genres.split(", ")).pop(),c.genres=f.join(", ")),[2,c]}}))}))},s.prototype.parseChapter=function(n){return e(this,void 0,void 0,(function(){var e,a;return t(this,(function(t){switch(t.label){case 0:return[4,this.safeFecth(this.site+n).then((function(e){return e.text()}))];case 1:return e=t.sent(),a=(0,r.load)(e),[2,a("div.par").html()||""]}}))}))},s.prototype.searchNovels=function(r,n){return e(this,void 0,void 0,(function(){var e,a,i,s=this;return t(this,(function(t){switch(t.label){case 0:return 1!==n?[2,[]]:(e=this.site+"wp-admin/admin-ajax.php?action=autosuggest&q="+encodeURIComponent(r),[4,this.safeFecth(e)]);case 1:return[4,t.sent().json()];case 2:return a=t.sent(),i=[],a.items[0].results.map((function(e){var t={name:e.title.replace(/<\/?strong>/g,""),cover:e.thumbnail,path:e.permalink.replace(s.mainUrl,"").replace(s.site,"")};i.push(t)})),[2,i]}}))}))},s}())({id:"mtlnovel-pt",sourceSite:"https://pt.mtlnovels.com/",sourceName:"MTL Novel (PT)",options:{lang:"Portuguese"},filters:{order:{value:"view",label:"Order by",options:[{label:"Date",value:"date"},{label:"Name",value:"name"},{label:"Rating",value:"rating"},{label:"View",value:"view"}],type:"Picker"},sort:{value:"desc",label:"Sort by",options:[{label:"Descending",value:"desc"},{label:"Ascending",value:"asc"}],type:"Picker"},storyStatus:{value:"all",label:"Status",options:[{label:"All",value:"all"},{label:"Ongoing",value:"ongoing"},{label:"Complete",value:"completed"}],type:"Picker"}}});exports.default=s;