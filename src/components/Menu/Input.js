import styled, { css } from 'styled-components';

const InputGroup = styled.div`
  padding 8px;
  margin-bottom: 8px;
`;

const Input = styled.input`
  width: 100%;
  font-size: 24px;
  text-align: center;
  margin-bottom: 8px;
  padding: 8px 0;
  border: none;

  ${props =>
    props.error
      ? css`
          background-color: #ef9a9a;
          ::placeholder {
            color: white;
          }
        `
      : ''};
`;

export default Input;
export { InputGroup };
