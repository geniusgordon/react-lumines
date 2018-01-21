import styled from 'styled-components';

const Modal = styled.div`
  position: absolute;
  top: 30%;
  left: 0;
  right: 0;
  width: ${props => props.width || '30%'};
  margin: auto;
  background-color: #212121;
  padding: 8px;
  transition: width 0.2s;
`;

export default Modal;
