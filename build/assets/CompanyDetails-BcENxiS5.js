import{r as i,A as we,t as d,j as e,C as Ie,a as k,c as m,f as Ce,h as Se}from"./index-DLbxhN5b.js";import{C as X,a as ee}from"./CardBody-CiphQjNj.js";import{F as ke}from"./Form-Ddl1_pkm.js";import{I as u}from"./Input-zbm7CzFS.js";import{L as x}from"./Label-CLrThU9J.js";import{S as Le}from"./Spinner-Bpimp5IX.js";import{B as Fe}from"./BreadCrumb-DXVrPO39.js";import{g as Be,a as Ee,b as Re}from"./locations.api-DQSThfiA.js";const te=s=>s?{companyName:s.companyName||"",email:s.email||"",mobileNumber:s.mobileNumber||"",gstNumber:s.gstNumber||"",countryId:s.countryId&&typeof s.countryId=="object"?s.countryId._id:s.countryId||"",stateId:s.stateId&&typeof s.stateId=="object"?s.stateId._id:s.stateId||"",cityId:s.cityId&&typeof s.cityId=="object"?s.cityId._id:s.cityId||"",address:s.address||"",pincode:s.pincode||"",logo:s.logo||"",favicon:s.favicon||"",loginBanner:s.loginBanner||"",website:s.website||""}:{companyName:"",email:"",mobileNumber:"",gstNumber:"",countryId:"",stateId:"",cityId:"",address:"",pincode:"",logo:"",favicon:"",loginBanner:"",website:""},Ue=s=>{let c={};return s.companyName.trim()||(c.companyName="Company name is required"),s.email.trim()?/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(s.email)||(c.email="Invalid email address"):c.email="Email is required",s.mobileNumber.trim()?s.mobileNumber.length!==10&&(c.mobileNumber="Mobile number must be 10 digits"):c.mobileNumber="Mobile number is required",s.gstNumber.trim()||(c.gstNumber="GST number is required"),s.countryId||(c.countryId="Country is required"),s.stateId||(c.stateId="State is required"),s.cityId||(c.cityId="City is required"),s.address.trim()||(c.address="Address is required"),s.pincode.trim()?s.pincode.length!==6&&(c.pincode="Pincode must be 6 digits"):c.pincode="Pincode is required",s.website.trim()||(c.website="Website is required"),c},Ge=()=>{const{adminData:s,getAdmin:c}=i.useContext(we),[n,se]=i.useState({}),[p,ae]=i.useState(!1),y=i.useRef(null),[r,g]=i.useState(()=>te(s)),[L,re]=i.useState([]),[ie,W]=i.useState([]),[ne,O]=i.useState([]),[A,D]=i.useState(!1),[T,V]=i.useState(!1),[G,K]=i.useState(!1),[Z,H]=i.useState(!1),[j,F]=i.useState(null),[B,N]=i.useState(""),[Oe,v]=i.useState(!0),[P,E]=i.useState(null),[J,w]=i.useState(""),[Pe,I]=i.useState(!0),h=i.useRef(null),[z,R]=i.useState(null),[$,C]=i.useState(""),[ze,S]=i.useState(!0),b=i.useRef(null),oe=()=>r.countryId?G?"Loading states...":"Select State":"Select Country First",le=()=>r.stateId?Z?"Loading cities...":"Select City":"Select State First",Y=i.useCallback(async()=>{try{D(!0);const t=await Be();t.data.isOk&&re(t.data.data)}catch(t){console.error("Error fetching countries:",t),d.error("Failed to load countries")}finally{D(!1)}},[]),q=i.useCallback(async t=>{try{K(!0),W([]),O([]);const a=await Ee(t);a.data.isOk&&W(a.data.data)}catch(a){console.error("Error fetching states:",a),d.error("Failed to load states")}finally{K(!1)}},[]),M=i.useCallback(async t=>{try{H(!0),O([]);const a=await Re(t);a.data.isOk&&O(a.data.data)}catch(a){console.error("Error fetching cities:",a),d.error("Failed to load cities")}finally{H(!1)}},[]);i.useEffect(()=>{const t=async()=>{if(s?.countryId){const a=s.countryId._id||s.countryId;if(await q(a),s.stateId){const l=s.stateId._id||s.stateId;await M(l)}}};L.length>0&&t()},[s,L,q,M]),i.useEffect(()=>{s&&(g(te(s)),Y())},[s,Y]),i.useEffect(()=>{s?.logo&&(N(s.logo),v(!1))},[s?.logo]),i.useEffect(()=>{s?.favicon&&(w(s.favicon),I(!1))},[s?.favicon]),i.useEffect(()=>{s?.loginBanner&&(C(s.loginBanner),S(!1))},[s?.loginBanner]);const ce=()=>{const t={...r},a={...s};return JSON.stringify(t)!==JSON.stringify(a)||j!==null||P!==null||z!==null},de=t=>{const a=t.target.files[0];a&&(F(a),N(URL.createObjectURL(a)),v(!1))},_=t=>{t.preventDefault(),t.stopPropagation()},me=t=>{t.preventDefault(),t.stopPropagation();const a=t.dataTransfer.files[0];if(a){if(a.size>5*1024*1024){d.error("File size should not exceed 5MB");return}if(!a.type.startsWith("image/")){d.error("Only image files are allowed for logo");return}F(a),N(URL.createObjectURL(a)),v(!1)}},pe=t=>{t.preventDefault(),t.stopPropagation();const a=t.dataTransfer.files[0];if(a){if(a.size>1*1024*1024){d.error("File size should not exceed 1MB");return}if(!a.type.startsWith("image/")){d.error("Only image files are allowed for favicon");return}E(a),w(URL.createObjectURL(a)),I(!1)}},fe=t=>{t.preventDefault(),t.stopPropagation();const a=t.dataTransfer.files[0];if(a){if(a.size>2*1024*1024){d.error("Only image files up to 2MB are allowed");return}if(!a.type.startsWith("image/")){d.error("Only image files are allowed for login banner");return}R(a),C(URL.createObjectURL(a)),S(!1)}},ue=t=>{const a=t.target.files[0];if(a){if(a.size>1*1024*1024){d.error("File size should not exceed 1MB"),t.target.value="";return}if(!a.type.startsWith("image/")){d.error("Only image files are allowed for favicon"),t.target.value="";return}E(a),w(URL.createObjectURL(a)),I(!1)}},xe=()=>{E(null),w(""),I(!0),h.current&&(h.current.value="")},ge=()=>{w(""),E(null),g({...r,favicon:""}),I(!0),h.current&&(h.current.value="")},he=t=>{const a=t.target.files[0];if(a){if(a.size>2*1024*1024){d.error("Only image files up to 2MB are allowed");return}if(!a.type.startsWith("image/")){d.error("Only image files are allowed for login banner");return}R(a),C(URL.createObjectURL(a)),S(!1)}},be=()=>{R(null),C(""),S(!0),b.current&&(b.current.value="")},ye=()=>{C(""),R(null),g({...r,loginBanner:""}),S(!0),b.current&&(b.current.value="")};i.useEffect(()=>{!j&&r.logo&&(N(r.logo),v(!1))},[r.logo,j]);const je=t=>{t.preventDefault();const a=Ue(r);if(se(a),ae(!0),Object.keys(a).length!==0)return;const l=new FormData;for(let o in r)if(o==="countryId"||o==="stateId"||o==="cityId"){const Q=r[o]&&typeof r[o]=="object"?r[o]._id:r[o];l.append(o,Q)}else l.append(o,r[o]);j&&l.append("logo",j),P&&l.append("favicon",P),z&&l.append("loginBanner",z),V(!0),Se(s._id,l).then(o=>{o.data.isOk?(d.success("Company details updated successfully"),c(),F(null),xe(),be()):d.error(o.data.message)}).catch(o=>{console.error("Error updating company details:",o),d.error("Failed to update company details")}).finally(()=>{V(!1)})},f=async t=>{const{name:a,value:l}=t.target;let o=l;a==="mobileNumber"||a==="pincode"?(o=l.replace(/\D/g,""),g({...r,[a]:o})):a==="countryId"?L.find(ve=>ve._id===l)&&(g({...r,countryId:l,stateId:"",cityId:""}),await q(l)):a==="stateId"?(g({...r,stateId:l,cityId:""}),await M(l)):g(a==="cityId"?{...r,cityId:l}:{...r,[a]:o})},Ne=()=>{N(""),F(null),g({...r,logo:""}),v(!0),y.current&&(y.current.value="")},U=t=>t?t.startsWith("blob:")||t.startsWith("http")?t:Ce(t):"";return document.title="Company Details | Shree Balaji Trade-Wing",e.jsx("div",{className:"page-content",children:e.jsxs(Ie,{fluid:!0,children:[e.jsx(Fe,{maintitle:"Setup",title:"Company Details",pageTitle:"Setup"}),e.jsx("style",{children:`
            .premium-profile-avatar-container {
              width: 110px;
              height: 110px;
              border-radius: 50%;
              background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
              color: white;
              font-size: 38px;
              font-weight: 700;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 15px auto;
              box-shadow: 0 4px 15px rgba(29, 78, 216, 0.2);
              border: 3px solid #ffffff;
            }
            .premium-profile-avatar-img {
              width: 110px;
              height: 110px;
              border-radius: 50%;
              object-fit: contain;
              background-color: #f8fafc;
              border: 3px solid #ffffff;
              box-shadow: 0 4px 15px rgba(0,0,0,0.06);
              margin: 0 auto 15px auto;
              display: block;
            }
            .premium-upload-card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              transition: all 0.3s ease;
              background-color: #ffffff;
              overflow: hidden;
            }
            .premium-upload-card:hover {
              box-shadow: 0 8px 24px rgba(148, 163, 184, 0.12);
              border-color: #cbd5e1;
            }
            .premium-upload-dropzone {
              border: 2px dashed #cbd5e1;
              border-radius: 8px;
              padding: 24px 16px;
              text-align: center;
              background-color: #f8fafc;
              cursor: pointer;
              transition: all 0.2s ease;
            }
            .premium-upload-dropzone:hover {
              border-color: #3b82f6;
              background-color: #eff6ff;
            }
            .premium-preview-wrapper {
              position: relative;
              display: inline-block;
              border-radius: 8px;
              padding: 6px;
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
            }
            .premium-delete-badge {
              position: absolute;
              top: -8px;
              right: -8px;
              width: 22px;
              height: 22px;
              border-radius: 50%;
              background-color: #ef4444;
              color: #ffffff;
              border: none;
              font-size: 14px;
              line-height: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
              transition: all 0.2s ease;
            }
            .premium-delete-badge:hover {
              background-color: #dc2626;
              transform: scale(1.1);
            }
            .form-section-card {
              border: 1px solid #f1f5f9;
              border-radius: 12px;
              background: #ffffff;
              box-shadow: 0 1px 3px rgba(0,0,0,0.02);
              padding: 24px;
              margin-bottom: 24px;
            }
            .form-section-header {
              font-size: 15px;
              font-weight: 700;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 20px;
              display: flex;
              align-items: center;
              border-left: 3px solid #3b82f6;
              padding-left: 10px;
            }
            .btn-save-changes {
              padding: 12px 28px;
              font-size: 15px;
              font-weight: 600;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
              transition: all 0.2s ease;
            }
            .btn-save-changes:hover:not(:disabled) {
              transform: translateY(-1px);
              box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
            }
            @media (max-width: 575.98px) {
              .btn-save-changes {
                width: 100%;
              }
            }
          `}),e.jsxs(k,{children:[e.jsxs(m,{lg:4,xl:3,className:"d-flex flex-column",children:[e.jsx(X,{className:"profile-card text-center p-4 mb-4",children:e.jsxs(ee,{className:"p-0",children:[B?e.jsx("img",{src:U(B),alt:"Company Logo",className:"premium-profile-avatar-img"}):e.jsx("div",{className:"premium-profile-avatar-container",children:r.companyName?r.companyName.charAt(0).toUpperCase():"C"}),e.jsx("h4",{className:"fw-semibold mb-3 text-dark text-truncate",children:r.companyName||"Company Name"}),e.jsxs("div",{className:"text-muted text-start border-top pt-3 mt-3 fs-13",children:[r.email&&e.jsxs("div",{className:"d-flex align-items-center mb-2",children:[e.jsx("i",{className:"ri-mail-line me-2 text-primary fs-15"}),e.jsx("span",{className:"text-truncate",children:r.email})]}),r.website&&e.jsxs("div",{className:"d-flex align-items-center",children:[e.jsx("i",{className:"ri-global-line me-2 text-primary fs-15"}),e.jsx("a",{href:r.website.startsWith("http")?r.website:`https://${r.website}`,target:"_blank",rel:"noreferrer",className:"text-truncate text-primary text-decoration-none",children:r.website})]})]})]})}),e.jsx(X,{className:"premium-upload-card mb-4 flex-grow-1",children:e.jsxs(ee,{className:"p-3 d-flex flex-column",children:[e.jsxs("span",{className:"fw-semibold d-block text-dark mb-3 fs-14 border-bottom pb-2",children:[e.jsx("i",{className:"ri-image-edit-line me-1 text-primary align-middle"}),"Branding Assets"]}),e.jsxs("div",{className:"flex-grow-1 d-flex flex-column justify-content-around",children:[e.jsxs("div",{className:"mb-3",children:[e.jsx("span",{className:"fw-medium d-block text-muted mb-2 fs-12",children:"Company Logo"}),B?e.jsx("div",{className:"text-center",children:e.jsxs("div",{className:"premium-preview-wrapper",children:[e.jsx("img",{src:U(B),alt:"Logo Preview",style:{width:"90px",height:"90px",objectFit:"contain"}}),e.jsx("button",{type:"button",className:"premium-delete-badge",onClick:Ne,title:"Remove Logo",children:"×"})]})}):e.jsxs("div",{className:"premium-upload-dropzone",onClick:()=>y.current&&y.current.click(),role:"button",tabIndex:0,"aria-label":"Upload logo",onKeyDown:t=>{(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),y.current&&y.current.click())},onDragOver:_,onDrop:me,style:{padding:"16px 10px"},children:[e.jsx("i",{className:"ri-image-add-line text-muted fs-20 mb-1 d-block"}),e.jsx("span",{className:"fs-11 fw-medium text-dark d-block",children:"Upload Logo"})]}),e.jsx("input",{"aria-label":"Upload company logo",id:"logo",type:"file",name:"logo",accept:".jpg, .jpeg, .png",onChange:de,ref:y,style:{display:"none"}}),p&&n.logo&&e.jsx("p",{className:"text-danger fs-11 mt-1 text-center mb-0",children:n.logo})]}),e.jsxs(k,{className:"g-2",children:[e.jsxs(m,{xs:6,children:[e.jsx("span",{className:"fw-medium d-block text-muted mb-2 fs-12",title:"Max 1MB",children:"Favicon"}),J?e.jsx("div",{className:"text-center",children:e.jsxs("div",{className:"premium-preview-wrapper",children:[e.jsx("img",{src:U(J),alt:"Favicon Preview",style:{width:"32px",height:"32px",objectFit:"contain"}}),e.jsx("button",{type:"button",className:"premium-delete-badge",onClick:ge,title:"Remove Favicon",children:"×"})]})}):e.jsxs("div",{className:"premium-upload-dropzone",onClick:()=>h.current&&h.current.click(),role:"button",tabIndex:0,"aria-label":"Upload favicon",onKeyDown:t=>{(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),h.current&&h.current.click())},onDragOver:_,onDrop:pe,style:{padding:"16px 8px",minHeight:"100px",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center"},children:[e.jsx("i",{className:"ri-global-line text-muted fs-20 mb-1 d-block"}),e.jsx("span",{className:"fs-10 fw-medium text-dark d-block",children:"Upload Favicon"}),e.jsx("span",{className:"fs-9 text-muted",children:"Max 1MB"})]}),e.jsx("input",{"aria-label":"Upload favicon",id:"favicon",type:"file",name:"favicon",accept:".jpg, .jpeg, .png, .ico",onChange:ue,ref:h,style:{display:"none"}})]}),e.jsxs(m,{xs:6,children:[e.jsx("span",{className:"fw-medium d-block text-muted mb-2 fs-12",title:"Max 2MB",children:"Login Banner"}),$?e.jsx("div",{className:"text-center",children:e.jsxs("div",{className:"premium-preview-wrapper",style:{width:"100%",maxWidth:"120px"},children:[e.jsx("img",{src:U($),alt:"Login Banner Preview",style:{width:"100%",height:"32px",objectFit:"contain"}}),e.jsx("button",{type:"button",className:"premium-delete-badge",onClick:ye,title:"Remove Login Banner",children:"×"})]})}):e.jsxs("div",{className:"premium-upload-dropzone",onClick:()=>b.current&&b.current.click(),role:"button",tabIndex:0,"aria-label":"Upload login banner",onKeyDown:t=>{(t.key==="Enter"||t.key===" ")&&(t.preventDefault(),b.current&&b.current.click())},onDragOver:_,onDrop:fe,style:{padding:"16px 8px",minHeight:"100px",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center"},children:[e.jsx("i",{className:"ri-layout-grid-line text-muted fs-20 mb-1 d-block"}),e.jsx("span",{className:"fs-10 fw-medium text-dark d-block",children:"Upload Banner"}),e.jsx("span",{className:"fs-9 text-muted",children:"Max 2MB"})]}),e.jsx("input",{"aria-label":"Upload login page banner",id:"loginBanner",type:"file",name:"loginBanner",accept:".jpg, .jpeg, .png, .gif, .webp",onChange:he,ref:b,style:{display:"none"}})]})]})]})]})})]}),e.jsx(m,{lg:8,xl:9,children:e.jsxs(ke,{onSubmit:je,children:[e.jsxs("div",{className:"form-section-card",children:[e.jsxs("div",{className:"form-section-header",children:[e.jsx("i",{className:"ri-building-line me-2 text-primary fs-17"}),"Company Information"]}),e.jsxs(k,{children:[e.jsx(m,{md:6,lg:4,children:e.jsxs("div",{className:"form-floating mb-3",children:[e.jsx(u,{id:"companyName",type:"text",className:"form-control",placeholder:"Enter Company name",required:!0,name:"companyName",value:r.companyName,onChange:f}),e.jsxs(x,{htmlFor:"companyName",children:["Company name ",e.jsx("span",{className:"text-danger",children:"*"})]}),p&&n.companyName&&e.jsx("p",{className:"text-danger fs-12 mt-1",children:n.companyName})]})}),e.jsx(m,{md:6,lg:4,children:e.jsxs("div",{className:"form-floating mb-3",children:[e.jsx(u,{id:"website",type:"text",className:"form-control",placeholder:"Website",required:!0,name:"website",value:r.website,onChange:f,maxLength:100}),e.jsxs(x,{htmlFor:"website",children:["Website ",e.jsx("span",{className:"text-danger",children:"*"})]}),p&&n.website&&e.jsx("p",{className:"text-danger fs-12 mt-1",children:n.website})]})}),e.jsx(m,{md:6,lg:4,children:e.jsxs("div",{className:"form-floating mb-3",children:[e.jsx(u,{id:"gstNumber",type:"text",className:"form-control",placeholder:"Enter GST Number",required:!0,name:"gstNumber",value:r.gstNumber,onChange:f}),e.jsxs(x,{htmlFor:"gstNumber",children:["GST Number ",e.jsx("span",{className:"text-danger",children:"*"})]}),p&&n.gstNumber&&e.jsx("p",{className:"text-danger fs-12 mt-1",children:n.gstNumber})]})})]})]}),e.jsxs("div",{className:"form-section-card",children:[e.jsxs("div",{className:"form-section-header",children:[e.jsx("i",{className:"ri-contacts-book-line me-2 text-primary fs-17"}),"Contact Details"]}),e.jsxs(k,{children:[e.jsx(m,{md:6,children:e.jsxs("div",{className:"form-floating mb-3",children:[e.jsx(u,{id:"companyEmail",type:"text",className:"form-control",placeholder:"Enter Email",required:!0,name:"email",value:r.email,onChange:f}),e.jsxs(x,{htmlFor:"companyEmail",children:["Email ",e.jsx("span",{className:"text-danger",children:"*"})]}),p&&n.email&&e.jsx("p",{className:"text-danger fs-12 mt-1",children:n.email})]})}),e.jsx(m,{md:6,children:e.jsxs("div",{className:"form-floating mb-3",children:[e.jsx(u,{id:"mobileNumber",type:"text",className:"form-control",placeholder:"Mobile Number",required:!0,name:"mobileNumber",value:r.mobileNumber,onChange:f,maxLength:10}),e.jsxs(x,{htmlFor:"mobileNumber",children:["Mobile Number ",e.jsx("span",{className:"text-danger",children:"*"})]}),p&&n.mobileNumber&&e.jsx("p",{className:"text-danger fs-12 mt-1",children:n.mobileNumber})]})})]})]}),e.jsxs("div",{className:"form-section-card",children:[e.jsxs("div",{className:"form-section-header",children:[e.jsx("i",{className:"ri-map-pin-line me-2 text-primary fs-17"}),"Location Details"]}),e.jsxs(k,{children:[e.jsx(m,{sm:6,md:3,children:e.jsxs("div",{className:"form-floating mb-3",children:[e.jsxs(u,{id:"countrySelect",type:"select",className:"form-control",name:"countryId",value:r.countryId,onChange:f,disabled:A,children:[e.jsx("option",{value:"",children:A?"Loading countries...":"Select Country"}),L.map(t=>e.jsx("option",{value:t._id,children:t.countryName},t._id))]}),e.jsxs(x,{htmlFor:"countrySelect",children:["Country ",e.jsx("span",{className:"text-danger",children:"*"})]}),p&&n.countryId&&e.jsx("p",{className:"text-danger fs-12 mt-1",children:n.countryId})]})}),e.jsx(m,{sm:6,md:3,children:e.jsxs("div",{className:"form-floating mb-3",children:[e.jsxs(u,{id:"stateSelect",type:"select",className:"form-control",name:"stateId",value:r.stateId,onChange:f,disabled:!r.countryId||G,children:[e.jsx("option",{value:"",children:oe()}),ie.map(t=>e.jsx("option",{value:t._id,children:t.stateName},t._id))]}),e.jsxs(x,{htmlFor:"stateSelect",children:["State ",e.jsx("span",{className:"text-danger",children:"*"})]}),p&&n.stateId&&e.jsx("p",{className:"text-danger fs-12 mt-1",children:n.stateId})]})}),e.jsx(m,{sm:6,md:3,children:e.jsxs("div",{className:"form-floating mb-3",children:[e.jsxs(u,{id:"citySelect",type:"select",className:"form-control",name:"cityId",value:r.cityId,onChange:f,disabled:!r.stateId||Z,children:[e.jsx("option",{value:"",children:le()}),ne.map(t=>e.jsx("option",{value:t._id,children:t.cityName},t._id))]}),e.jsxs(x,{htmlFor:"citySelect",children:["City ",e.jsx("span",{className:"text-danger",children:"*"})]}),p&&n.cityId&&e.jsx("p",{className:"text-danger fs-12 mt-1",children:n.cityId})]})}),e.jsx(m,{sm:6,md:3,children:e.jsxs("div",{className:"form-floating mb-3",children:[e.jsx(u,{id:"pincode",type:"text",className:"form-control",placeholder:"Enter Pincode",required:!0,name:"pincode",value:r.pincode,onChange:f,maxLength:6}),e.jsxs(x,{htmlFor:"pincode",children:["Pincode ",e.jsx("span",{className:"text-danger",children:"*"})]}),p&&n.pincode&&e.jsx("p",{className:"text-danger fs-12 mt-1",children:n.pincode})]})}),e.jsx(m,{xs:12,children:e.jsxs("div",{className:"form-floating mb-3",children:[e.jsx(u,{id:"address",type:"textarea",className:"form-control",placeholder:"Enter Address",required:!0,name:"address",style:{height:"100px"},value:r.address,onChange:f}),e.jsxs(x,{htmlFor:"address",children:["Address ",e.jsx("span",{className:"text-danger",children:"*"})]}),p&&n.address&&e.jsx("p",{className:"text-danger fs-12 mt-1",children:n.address})]})})]})]}),e.jsx("div",{className:"text-end mb-4",children:e.jsx("button",{type:"submit",className:"btn btn-success btn-save-changes",disabled:!ce()||T,children:T?e.jsxs(e.Fragment,{children:[e.jsx(Le,{size:"sm",className:"me-2"}),"Saving..."]}):e.jsxs(e.Fragment,{children:[e.jsx("i",{className:"ri-save-3-line align-middle me-1"}),"Save Changes"]})})})]})})]})]})})};export{Ge as default};
